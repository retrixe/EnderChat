package com.enderchat;

import android.animation.ArgbEvaluator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.uimanager.IllegalViewOperationException;
import java.util.Map;
import java.util.HashMap;


public class NavBarColorModule extends ReactContextBaseJavaModule {
    NavBarColorModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "NavBarColorModule";
    }

    @ReactMethod
    public void setNavigationBarColor(String color, boolean light, boolean animated) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && getCurrentActivity() != null) {
            try {
                final Window window = getCurrentActivity().getWindow();
                UiThreadUtil.runOnUiThread(() -> {
                    if (animated) {
                        Integer colorFrom = window.getNavigationBarColor();
                        Integer colorTo = Color.parseColor(String.valueOf(color));
                        ValueAnimator colorAnimation = ValueAnimator.ofObject(new ArgbEvaluator(), colorFrom, colorTo);
                        colorAnimation.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
                            @Override
                            public void onAnimationUpdate(ValueAnimator animator) {
                                window.setNavigationBarColor((Integer) animator.getAnimatedValue());
                            }
                        });
                        colorAnimation.start();
                    } else {
                        window.setNavigationBarColor(Color.parseColor(String.valueOf(color)));
                    }
                    setNavigationBarTheme(getCurrentActivity(), light);
                });
            } catch (IllegalViewOperationException ignored) {}
        }
    }

    public void setNavigationBarTheme(Activity activity, Boolean light) {
        if (activity != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Window window = activity.getWindow();
            int flags = window.getDecorView().getSystemUiVisibility();
            if (light) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            } else {
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
            window.getDecorView().setSystemUiVisibility(flags);
        }
    }
}
