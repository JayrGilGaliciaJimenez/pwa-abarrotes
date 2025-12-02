package mtzg.carlos.server.modules.stores;

import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import mtzg.carlos.server.modules.products.ProductModel;
import mtzg.carlos.server.modules.users.UserModel;
import mtzg.carlos.server.modules.visits.VisitModel;

@Data
@Entity
@AllArgsConstructor
@NoArgsConstructor
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

    @ManyToMany(mappedBy = "stores")
    private Set<ProductModel> products;

    @ManyToMany(mappedBy = "stores")
    private Set<UserModel> users;

    @OneToMany(mappedBy = "store")
    private Set<VisitModel> visits;
}
