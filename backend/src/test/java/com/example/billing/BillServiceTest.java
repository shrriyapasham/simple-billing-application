package com.example.billing;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;

import static com.example.billing.BillDtos.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class BillServiceTest {

    @Autowired
    private BillService service;

    @Test
    void appliesTenPercentDiscountOnlyAboveOneThousand() {
        // ₹650 (Backpack) + ₹350 (USB Drive) = ₹1,000.00 exactly -> 0% discount
        BillResponse exact = service.validateAndCalculate(new BillRequest("Asha", List.of(
            new BillItemRequest(3L, 1),
            new BillItemRequest(6L, 1)
        )));
        assertEquals(0, exact.subtotal().compareTo(new BigDecimal("1000.00")));
        assertEquals(0, exact.discountPercent().compareTo(new BigDecimal("0.00")));
        assertEquals(0, exact.discountAmount().compareTo(new BigDecimal("0.00")));
        assertEquals(0, exact.finalAmount().compareTo(new BigDecimal("1000.00")));

        // ₹650 * 2 = ₹1,300.00 > ₹1,000.00 -> 10% discount = ₹130.00
        BillResponse over = service.validateAndCalculate(new BillRequest("Asha", List.of(
            new BillItemRequest(3L, 2)
        )));
        assertEquals(0, over.subtotal().compareTo(new BigDecimal("1300.00")));
        assertEquals(0, over.discountPercent().compareTo(new BigDecimal("10.00")));
        assertEquals(0, over.discountAmount().compareTo(new BigDecimal("130.00")));
        assertEquals(0, over.finalAmount().compareTo(new BigDecimal("1170.00")));
    }

    @Test
    void rejectsZeroQuantity() {
        assertThrows(IllegalArgumentException.class, () ->
            service.validateAndCalculate(new BillRequest("Test", List.of(new BillItemRequest(1L, 0)))));
    }

    @Test
    void rejectsNegativeQuantity() {
        assertThrows(IllegalArgumentException.class, () ->
            service.validateAndCalculate(new BillRequest("Test", List.of(new BillItemRequest(1L, -5)))));
    }

    @Test
    void rejectsBlankCustomerName() {
        assertThrows(IllegalArgumentException.class, () ->
            service.validateAndCalculate(new BillRequest("   ", List.of(new BillItemRequest(1L, 1)))));
    }

    @Test
    void rejectsEmptyItems() {
        assertThrows(IllegalArgumentException.class, () ->
            service.validateAndCalculate(new BillRequest("Test", List.of())));
    }

    @Test
    void createsAndPersistsInvoiceAndRetrievesIt() {
        BillRequest request = new BillRequest("Rohan Mehta", List.of(
            new BillItemRequest(1L, 2), // Notebook: 80 * 2 = 160
            new BillItemRequest(5L, 3)  // Calculator: 450 * 3 = 1350
        )); // Subtotal = 1510.00 -> 10% discount = 151.00 -> final = 1359.00

        InvoiceResponse created = service.createAndSaveInvoice(request);

        assertNotNull(created.id());
        assertNotNull(created.invoiceNumber());
        assertTrue(created.invoiceNumber().startsWith("INV-"));
        assertEquals("Rohan Mehta", created.customerName());
        assertEquals(2, created.items().size());
        assertEquals(0, created.subtotal().compareTo(new BigDecimal("1510.00")));
        assertEquals(0, created.discountAmount().compareTo(new BigDecimal("151.00")));
        assertEquals(0, created.finalAmount().compareTo(new BigDecimal("1359.00")));

        // Verify retrieval by ID
        InvoiceResponse fetched = service.getInvoiceById(created.id());
        assertEquals(created.id(), fetched.id());
        assertEquals(created.invoiceNumber(), fetched.invoiceNumber());

        // Verify retrieval in search
        List<InvoiceResponse> searchResults = service.getAllInvoices("Rohan");
        assertFalse(searchResults.isEmpty());
        assertTrue(searchResults.stream().anyMatch(inv -> inv.id().equals(created.id())));
    }
}
