package com.evergreen.holdings;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        registerPlugin(EvergreenSessionPlugin.class);
        super.onCreate(state);
    }
}
