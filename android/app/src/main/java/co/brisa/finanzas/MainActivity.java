package co.brisa.finanzas;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import androidx.browser.customtabs.CustomTabsClient;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.customtabs.CustomTabColorSchemeParams;

/** Online Android client. The browser owns the account session and downloads. */
public final class MainActivity extends Activity {
 private static final Uri SITE=Uri.parse("https://brisa-finanzas-cristian.mediaintegral67.chatgpt.site/");
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setGravity(Gravity.CENTER);int space=(int)(28*getResources().getDisplayMetrics().density);layout.setPadding(space,space,space,space);layout.setBackgroundColor(Color.rgb(246,248,247));
  TextView title=new TextView(this);title.setText("brisa.");title.setTextSize(44);title.setTextColor(Color.rgb(40,124,96));layout.addView(title);
  TextView description=new TextView(this);description.setText("Tu dinero, en calma.\n\nLa misma cuenta y los mismos datos de la web. Necesitas conexión a internet.\n");description.setTextSize(18);description.setGravity(Gravity.CENTER);layout.addView(description);
  Button open=new Button(this);open.setText("Abrir mis finanzas");open.setOnClickListener(v->openBrisa());layout.addView(open);
  Button permissions=new Button(this);permissions.setText("Ajustes del navegador · permisos");permissions.setOnClickListener(v->{String browser=CustomTabsClient.getPackageName(this,null);if(browser==null){Toast.makeText(this,"Abre Ajustes → Aplicaciones → tu navegador → Notificaciones.",Toast.LENGTH_LONG).show();return;}try{startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+browser)));}catch(ActivityNotFoundException e){Toast.makeText(this,"Abre los ajustes de tu navegador manualmente.",Toast.LENGTH_LONG).show();}});layout.addView(permissions);
  TextView permissionsGuide=new TextView(this);permissionsGuide.setText("Para la prueba de avisos, permite Notificaciones en el navegador y en el sitio Brisa. Mantén la optimización de batería: esta versión no necesita ejecución permanente. Al volver a Brisa, abre Configuración → Permisos y segundo plano.");permissionsGuide.setTextSize(14);layout.addView(permissionsGuide);
  TextView note=new TextView(this);note.setText("\nEl acceso se realiza en tu navegador seguro. Los recordatorios se muestran dentro de Brisa; no se leen SMS ni se envían notificaciones en segundo plano.");note.setTextSize(14);note.setGravity(Gravity.CENTER);layout.addView(note);
  setContentView(layout);
  if(state==null)openBrisa();
 }
 private void openBrisa(){
  try{CustomTabsIntent tab=new CustomTabsIntent.Builder().setShowTitle(true).setDefaultColorSchemeParams(new CustomTabColorSchemeParams.Builder().setToolbarColor(Color.rgb(40,124,96)).build()).build();tab.launchUrl(this,SITE);}
  catch(ActivityNotFoundException e){try{startActivity(new Intent(Intent.ACTION_VIEW,SITE));}catch(ActivityNotFoundException ignored){Toast.makeText(this,"Instala o habilita un navegador para abrir Brisa.",Toast.LENGTH_LONG).show();}}
 }
}
