package com.example.billing;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.math.BigDecimal;

@Configuration
public class DataSeeder {
    @Bean
    CommandLineRunner seedProducts(ProductRepository repo) {
        return args -> {
            if (repo.count() == 0) {
                repo.save(new Product("Notebook", new BigDecimal("80.00")));
                repo.save(new Product("Pen", new BigDecimal("20.00")));
                repo.save(new Product("Backpack", new BigDecimal("650.00")));
                repo.save(new Product("Water Bottle", new BigDecimal("180.00")));
                repo.save(new Product("Calculator", new BigDecimal("450.00")));
                repo.save(new Product("USB Drive", new BigDecimal("350.00")));
            }
        };
    }
}
