package com.example.billing;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String name;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    protected Product() {}
    public Product(String name, BigDecimal price) { this.name = name; this.price = price; }
    public Long getId() { return id; }
    public String getName() { return name; }
    public BigDecimal getPrice() { return price; }
}
