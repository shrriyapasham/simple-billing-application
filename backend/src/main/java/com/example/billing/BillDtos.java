package com.example.billing;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class BillDtos {

    public record BillRequest(
        @NotBlank(message = "Customer name is required") String customerName,
        @NotEmpty(message = "Add at least one product") List<@Valid BillItemRequest> items
    ) {}

    public record BillItemRequest(
        @NotNull(message = "Product ID is required") Long productId,
        @NotNull(message = "Quantity is required") @Min(value = 1, message = "Quantity must be a positive integer") Integer quantity
    ) {}

    public record BillLine(
        Long productId,
        String productName,
        BigDecimal price,
        Integer quantity,
        BigDecimal total
    ) {}

    public record BillResponse(
        String customerName,
        List<BillLine> items,
        BigDecimal subtotal,
        BigDecimal discountPercent,
        BigDecimal discountAmount,
        BigDecimal finalAmount
    ) {}

    public record InvoiceResponse(
        Long id,
        String invoiceNumber,
        String customerName,
        LocalDateTime createdAt,
        List<BillLine> items,
        BigDecimal subtotal,
        BigDecimal discountPercent,
        BigDecimal discountAmount,
        BigDecimal finalAmount
    ) {}
}
