package co.brisa.finanzas;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Servicio de escucha de notificaciones de Android para Brisa.
 * Intercepta notificaciones de Google Wallet / Google Pay, aplicaciones bancarias colombianas
 * (Bancolombia, Nequi, Daviplata, Nu, Scotiabank, BBVA) y mensajes SMS bancarios para
 * sincronizar transacciones en tiempo real con el servidor de Brisa.
 */
public class BrisaNotificationListener extends NotificationListenerService {
    private static final String TAG = "BrisaNotificationSync";
    private static final String PREFS_NAME = "brisa_sync_prefs";
    private static final String KEY_WEBHOOK_URL = "webhook_url";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    // Paquetes soportados para sincronización financiera automática
    private static final Set<String> SUPPORTED_PACKAGES = new HashSet<>(Arrays.asList(
            "com.google.android.apps.walletnfcrel", // Google Wallet / Google Pay
            "com.bancolombia.personas",             // Bancolombia Personas
            "co.com.nequi",                         // Nequi Colombia
            "com.davivienda.daviplata",             // Daviplata
            "com.davivienda.personas",              // Davivienda móvil
            "co.nu",                                // Nu Colombia
            "com.bbva.bbvacontigo",                 // BBVA Colombia
            "com.google.android.apps.messaging",    // Google Mensajes (SMS bancarios)
            "com.samsung.android.messaging"         // Samsung Mensajes (SMS bancarios)
    ));

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null || !SUPPORTED_PACKAGES.contains(packageName)) {
            return;
        }

        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;
        if (extras == null) return;

        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigTextCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

        String title = titleCs != null ? titleCs.toString() : "";
        String text = bigTextCs != null ? bigTextCs.toString() : (textCs != null ? textCs.toString() : "");

        String combined = (title + " " + text).trim();
        if (combined.isEmpty()) return;

        // Comprobar si contiene indicios de transacción monetaria
        boolean hasMoney = combined.contains("$") ||
                combined.toUpperCase().contains("COP") ||
                combined.toLowerCase().contains("compra") ||
                combined.toLowerCase().contains("pago") ||
                combined.toLowerCase().contains("debito") ||
                combined.toLowerCase().contains("recibiste") ||
                combined.toLowerCase().contains("transferiste");

        if (!hasMoney) return;

        // Determinar el origen
        String source = "Notificación bancaria";
        if (packageName.equals("com.google.android.apps.walletnfcrel")) {
            source = "Google Pay";
        }

        final String finalSource = source;
        final String finalContent = combined;
        final String finalPackage = packageName;

        executor.execute(() -> sendToBrisaWebhook(finalSource, finalContent, finalPackage));
    }

    private void sendToBrisaWebhook(String source, String content, String packageName) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String webhookUrl = prefs.getString(KEY_WEBHOOK_URL, null);

        if (webhookUrl == null || webhookUrl.trim().isEmpty()) {
            Log.w(TAG, "Webhook URL no configurada en la app Android.");
            return;
        }

        HttpURLConnection conn = null;
        try {
            JSONObject payload = new JSONObject();
            payload.put("source", source);
            payload.put("text", content);
            payload.put("packageName", packageName);
            payload.put("auto_register", true);

            byte[] jsonBytes = payload.toString().getBytes(StandardCharsets.UTF_8);

            URL url = new URL(webhookUrl);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setDoOutput(true);
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonBytes);
                os.flush();
            }

            int responseCode = conn.getResponseCode();
            Log.i(TAG, "Sincronización enviada con éxito a Brisa. Código HTTP: " + responseCode);
        } catch (Exception e) {
            Log.e(TAG, "Error enviando notificación a Brisa: " + e.getMessage());
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }
}
