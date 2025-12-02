package mtzg.carlos.server.modules.products.dto;

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
public class ProductUpdateDto {

    public static final String NO_ANGLE_BRACKETS_MESSAGE = "must not contain angle brackets";
    public static final String NO_ANGLE_BRACKETS_REGEX = "^[^<>]*$";

    @Pattern(regexp = NO_ANGLE_BRACKETS_REGEX, message = NO_ANGLE_BRACKETS_MESSAGE)
    private String name;

    @Pattern(regexp = NO_ANGLE_BRACKETS_REGEX, message = NO_ANGLE_BRACKETS_MESSAGE)
    private String description;

    @Min(value = 1, message = "Base price must be non-negative and greater than zero")
    private Double basePrice;

    public void setName(String name) {
        this.name = name != null ? name.trim() : null;
    }

    public void setDescription(String description) {
        this.description = description != null ? description.trim() : null;
    }
}
