package mtzg.carlos.server.modules.stores;

import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import mtzg.carlos.server.modules.products.ProductModel;
import mtzg.carlos.server.modules.users.UserModel;
import mtzg.carlos.server.modules.visits.VisitModel;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = { "products", "users", "visits" })
@EqualsAndHashCode(exclude = { "products", "users", "visits" })
@Entity
@Table(name = "store")
public class StoreModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "address", nullable = false)
    private String address;

    @Column(name = "latitude", nullable = false)
    private String latitude;

    @Column(name = "longitude", nullable = false)
    private String longitude;

    @Column(name = "qr_code", nullable = false)
    private String qrCode;

    @ManyToMany(mappedBy = "stores", fetch = FetchType.LAZY)
    private Set<ProductModel> products;

    @ManyToMany(mappedBy = "stores", fetch = FetchType.LAZY)
    private Set<UserModel> users;

    @OneToMany(mappedBy = "store", fetch = FetchType.LAZY)
    private Set<VisitModel> visits;
}
