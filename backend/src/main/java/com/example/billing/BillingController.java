package com.example.billing;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.example.billing.BillDtos.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class BillingController {

    private final ProductRepository products;
    private final BillService bills;

    public BillingController(ProductRepository products, BillService bills) {
        this.products = products;
        this.bills = bills;
    }

    @GetMapping("/products")
    public List<Product> getProducts() {
        return products.findAll();
    }

    @PostMapping("/bills/validate")
    public BillResponse validateBill(@Valid @RequestBody BillRequest request) {
        return bills.validateAndCalculate(request);
    }

    @PostMapping("/invoices")
    public ResponseEntity<InvoiceResponse> createInvoice(@Valid @RequestBody BillRequest request) {
        InvoiceResponse response = bills.createAndSaveInvoice(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/invoices")
    public List<InvoiceResponse> getInvoices(@RequestParam(required = false) String search) {
        return bills.getAllInvoices(search);
    }

    @GetMapping("/invoices/{id}")
    public InvoiceResponse getInvoice(@PathVariable Long id) {
        return bills.getInvoiceById(id);
    }
}
