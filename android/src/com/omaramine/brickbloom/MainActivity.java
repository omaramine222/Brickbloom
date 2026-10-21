package com.omaramine.brickbloom;
import android.app.*;import android.os.*;import android.view.*;import android.webkit.*;import android.widget.*;import android.graphics.*;import android.net.*;import android.content.*;
public class MainActivity extends Activity {
  static final String URL="https://brickbloom-r586.onrender.com/";
  WebView web; LinearLayout overlay; TextView msg; Button retry; ProgressBar spin; Handler h=new Handler(Looper.getMainLooper());
  boolean loaded=false; long start; int tries=0;
  @Override protected void onCreate(Bundle b){ super.onCreate(b);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    FrameLayout root=new FrameLayout(this); root.setBackgroundColor(0xff7ec8f2);
    web=new WebView(this); WebSettings s=web.getSettings();
    s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true); s.setMediaPlaybackRequiresUserGesture(false);
    s.setLoadWithOverviewMode(true); s.setUseWideViewPort(true); s.setUserAgentString(s.getUserAgentString()+" BrickbloomApp/1.0");
    CookieManager.getInstance().setAcceptThirdPartyCookies(web,true);
    web.setVisibility(View.INVISIBLE);
    web.setWebViewClient(new WebViewClient(){
      public void onPageFinished(WebView v,String u){ v.evaluateJavascript("document.title",t->{
          String tt=t==null?"":t.toLowerCase();
          if(tt.contains("brickbloom")){ loaded=true; overlay.setVisibility(View.GONE); web.setVisibility(View.VISIBLE);} else scheduleRetry(); });}
      public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){ if(r.isForMainFrame()) scheduleRetry(); }
      public void onReceivedHttpError(WebView v,WebResourceRequest r,WebResourceResponse e){ if(r.isForMainFrame()&&e.getStatusCode()>=500) scheduleRetry(); }
      public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){ Uri u=r.getUrl();
        if("brickbloom-r586.onrender.com".equals(u.getHost())) return false;
        try{ startActivity(new Intent(Intent.ACTION_VIEW,u)); }catch(Exception x){} return true; }
    });
    web.setWebChromeClient(new WebChromeClient());
    root.addView(web,new FrameLayout.LayoutParams(-1,-1));
    overlay=new LinearLayout(this); overlay.setOrientation(LinearLayout.VERTICAL); overlay.setGravity(Gravity.CENTER); overlay.setBackgroundColor(0xff7ec8f2); overlay.setPadding(48,48,48,48);
    ImageView logo=new ImageView(this); logo.setImageResource(R.drawable.logo); int px=(int)(140*getResources().getDisplayMetrics().density);
    overlay.addView(logo,new LinearLayout.LayoutParams(px,px));
    TextView title=new TextView(this); title.setText("Brickbloom"); title.setTextSize(32); title.setTypeface(Typeface.DEFAULT_BOLD); title.setTextColor(Color.WHITE); title.setShadowLayer(6,0,3,0x80000000); title.setGravity(Gravity.CENTER); overlay.addView(title);
    spin=new ProgressBar(this); overlay.addView(spin);
    msg=new TextView(this); msg.setTextSize(17); msg.setTextColor(0xff1d3557); msg.setGravity(Gravity.CENTER); msg.setPadding(0,24,0,24); overlay.addView(msg);
    retry=new Button(this); retry.setText("Try again"); retry.setVisibility(View.GONE); retry.setOnClickListener(v->{tries=0;start=SystemClock.elapsedRealtime();load();}); overlay.addView(retry);
    root.addView(overlay,new FrameLayout.LayoutParams(-1,-1));
    setContentView(root); hideBars();
    start=SystemClock.elapsedRealtime(); load();
  }
  boolean online(){ ConnectivityManager cm=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE); NetworkInfo n=cm.getActiveNetworkInfo(); return n!=null&&n.isConnected(); }
  void load(){ retry.setVisibility(View.GONE); spin.setVisibility(View.VISIBLE);
    if(!online()){ msg.setText("No internet connection 📶\nConnect to Wi-Fi or mobile data and try again."); spin.setVisibility(View.GONE); retry.setVisibility(View.VISIBLE); return; }
    msg.setText(tries==0?"Loading…":"The server is waking up ☀️\nThis can take about a minute the first time. Hang tight!"); web.loadUrl(URL); }
  void scheduleRetry(){ if(loaded) return; web.setVisibility(View.INVISIBLE); overlay.setVisibility(View.VISIBLE); tries++;
    if(SystemClock.elapsedRealtime()-start>150000){ msg.setText("The server is taking too long to wake up 😴\nPlease try again in a moment."); spin.setVisibility(View.GONE); retry.setVisibility(View.VISIBLE); return; }
    msg.setText("The server is waking up ☀️\nThis can take about a minute the first time. Hang tight!"); h.removeCallbacksAndMessages(null); h.postDelayed(this::load,5000); }
  void hideBars(){ getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN); }
  @Override public void onWindowFocusChanged(boolean f){ super.onWindowFocusChanged(f); if(f) hideBars(); }
  @Override public void onBackPressed(){
    if(loaded&&web.canGoBack()){ web.goBack(); return; }
    new AlertDialog.Builder(this).setTitle("Leave Brickbloom?").setPositiveButton("Exit",(d,w)->finish()).setNegativeButton("Stay",null).show(); }
  @Override protected void onResume(){ super.onResume(); web.onResume(); }
  @Override protected void onPause(){ web.onPause(); super.onPause(); }
}
