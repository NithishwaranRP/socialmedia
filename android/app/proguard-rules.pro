# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.

# Keep rules for specific classes or methods
# Keep app's custom native modules
-keep class com.recaps_app.** { *; }

# Keep WebRTC and LiveKit classes
-keep class org.webrtc.** { *; }
-keep class com.livekit.** { *; }

# Keep WebSocket classes and allow reflection on them
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface

# Keep Firebase classes
-keep class com.google.firebase.** { *; }
-keep class io.invertase.firebase.** { *; }

# Keep Video components
-keep class com.facebook.react.views.video.** { *; }
-keep class com.google.android.exoplayer2.** { *; }

# Keep React Native bridges
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep React methods
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Add rules for libraries that require specific classes to be kept
# Keep Gson classes
-keep class com.google.gson.** { *; }

# For React Native modules
-keep class com.swmansion.** { *; }

# Hermes support
-keep class com.facebook.hermes.** { *; }

# Debugging - Add metadata for better crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
