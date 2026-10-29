package com.example.billing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    List<Invoice> findAllByOrderByCreatedAtDesc();

    @Query("SELECT i FROM Invoice i WHERE LOWER(i.customerName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(i.invoiceNumber) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY i.createdAt DESC")
    List<Invoice> searchInvoices(@Param("query") String query);

    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
}
