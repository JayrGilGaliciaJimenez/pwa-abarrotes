package mtzg.carlos.server.modules.products;

import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import mtzg.carlos.server.modules.orders.OrderModel;
import mtzg.carlos.server.modules.stores.StoreModel;

@Entity
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "product")
public class ProductModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "base_price", nullable = false)
    private double basePrice;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "store_products", joinColumns = @JoinColumn(name = "product_id"), inverseJoinColumns = @JoinColumn(name = "store_id"))
    private Set<StoreModel> stores;

    @OneToMany(mappedBy = "product", fetch = FetchType.LAZY)
    private Set<OrderModel> orders;
}
