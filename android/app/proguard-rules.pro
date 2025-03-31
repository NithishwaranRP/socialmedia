# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.

# Keep rules for specific classes or methods
# Example: Keep all classes in the package com.example.myapp
-keep class com.reelzzz_app.** { *; }

# Add any project specific keep options here:
# Add rules for libraries that require specific classes to be kept
# Example: Keep Gson classes
-keep class com.google.gson.** { *; }
