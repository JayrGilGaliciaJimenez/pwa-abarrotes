package mtzg.carlos.server.modules.stores.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class StoreUpdateDto {

    public static final String NO_ANGLE_BRACKETS_MESSAGE = "must not contain angle brackets";
    public static final String NO_ANGLE_BRACKETS_REGEX = "^[^<>]*$";

    @Pattern(regexp = NO_ANGLE_BRACKETS_REGEX, message = NO_ANGLE_BRACKETS_MESSAGE)
    private String name;

    @Pattern(regexp = NO_ANGLE_BRACKETS_REGEX, message = NO_ANGLE_BRACKETS_MESSAGE)
    private String address;

    @Min(value = -90, message = "Latitude must be between -90 and 90")
    @Max(value = 90, message = "Latitude must be between -90 and 90")
    private Double latitude;

    @Min(value = -180, message = "Longitude must be between -180 and 180")
    @Max(value = 180, message = "Longitude must be between -180 and 180")
    private Double longitude;

    public void setName(String name) {
        this.name = name != null ? name.trim() : null;
    }

    public void setAddress(String address) {
        this.address = address != null ? address.trim() : null;
    }
}
