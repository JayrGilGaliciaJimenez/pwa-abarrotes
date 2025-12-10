package mtzg.carlos.server.utils;

import java.io.IOException;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

public class QrUtils {
    private QrUtils() {
        throw new UnsupportedOperationException("Utility class");
    }

    public static String generateQrImage(String qrContent, String fileName, String baseDir)
            throws WriterException, IOException {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(qrContent, BarcodeFormat.QR_CODE, 250, 250);

        String filePath = baseDir + "/" + fileName + ".png";
        Path path = FileSystems.getDefault().getPath(filePath);

        Files.createDirectories(path.getParent());

        MatrixToImageWriter.writeToPath(bitMatrix, "PNG", path);

        return filePath;
    }
}
