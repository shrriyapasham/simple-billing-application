package com.example.billing;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import static com.example.billing.BillDtos.*;

@Service
public class BillService {

    private final ProductRepository products;
    private final InvoiceRepository invoiceRepository;

    public BillService(ProductRepository products, InvoiceRepository invoiceRepository) {
        this.products = products;
        this.invoiceRepository = invoiceRepository;
    }

    @Transactional(readOnly = true)
    public BillResponse validateAndCalculate(BillRequest request) {
        if (request.customerName() == null || request.customerName().isBlank()) {
            throw new IllegalArgumentException("Customer name is required");
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Add at least one product");
        }

        List<BillLine> lines = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (BillItemRequest item : request.items()) {
            if (item.quantity() == null || item.quantity() <= 0) {
                throw new IllegalArgumentException("Quantity must be a positive integer");
            }
            Product product = products.findById(item.productId())
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + item.productId()));

            BigDecimal total = product.getPrice().multiply(BigDecimal.valueOf(item.quantity())).setScale(2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(total);
            lines.add(new BillLine(product.getId(), product.getName(), product.getPrice(), item.quantity(), total));
        }

        subtotal = subtotal.setScale(2, RoundingMode.HALF_UP);
        BigDecimal percent = subtotal.compareTo(new BigDecimal("1000.00")) > 0 ? new BigDecimal("10.00") : BigDecimal.ZERO;
        BigDecimal discount = subtotal.multiply(percent).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal finalAmount = subtotal.subtract(discount).setScale(2, RoundingMode.HALF_UP);

        return new BillResponse(request.customerName().trim(), lines, subtotal, percent, discount, finalAmount);
    }

    @Transactional
    public InvoiceResponse createAndSaveInvoice(BillRequest request) {
        BillResponse calculated = validateAndCalculate(request);
        LocalDateTime now = LocalDateTime.now();

        long nextId = invoiceRepository.count() + 1;
        String datePrefix = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String invoiceNumber = String.format("INV-%s-%04d", datePrefix, nextId);

        Invoice invoice = new Invoice(
            invoiceNumber,
            calculated.customerName(),
            now,
            calculated.subtotal(),
            calculated.discountPercent(),
            calculated.discountAmount(),
            calculated.finalAmount()
        );

        for (BillLine line : calculated.items()) {
            invoice.addItem(new InvoiceItem(
                line.productId(),
                line.productName(),
                line.price(),
                line.quantity(),
                line.total()
            ));
        }

        Invoice saved = invoiceRepository.save(invoice);
        return toInvoiceResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> getAllInvoices(String search) {
        List<Invoice> list;
        if (search != null && !search.isBlank()) {
            list = invoiceRepository.searchInvoices(search.trim());
        } else {
            list = invoiceRepository.findAllByOrderByCreatedAtDesc();
        }
        return list.stream().map(this::toInvoiceResponse).toList();
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceById(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Invoice not found with ID: " + id));
        return toInvoiceResponse(invoice);
    }

    private InvoiceResponse toInvoiceResponse(Invoice invoice) {
        List<BillLine> lines = invoice.getItems().stream()
            .map(item -> new BillLine(
                item.getProductId(),
                item.getProductName(),
                item.getPrice(),
                item.getQuantity(),
                item.getTotal()
            ))
            .toList();

        return new InvoiceResponse(
            invoice.getId(),
            invoice.getInvoiceNumber(),
            invoice.getCustomerName(),
            invoice.getCreatedAt(),
            lines,
            invoice.getSubtotal(),
            invoice.getDiscountPercent(),
            invoice.getDiscountAmount(),
            invoice.getFinalAmount()
        );
    }
}
