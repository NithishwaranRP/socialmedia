package com.reelzzz_app

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.util.Log
import com.facebook.react.bridge.Promise
import android.net.Uri

class VideoOverlayModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "VideoOverlay"
    }

  @ReactMethod
fun overlayVideos(param1VideoPath: String, uploadedVideoPath: String, outputFilePath: String, promise: Promise) {
    val context = reactApplicationContext
    val videoOverlay = VideoOverlay(context)

    Log.d("VideoOverlay", "Merging videos with paths: $param1VideoPath, $uploadedVideoPath, output: $outputFilePath")

    videoOverlay.overlayVideos(Uri.parse(param1VideoPath), Uri.parse(uploadedVideoPath), outputFilePath) { success ->
        if (success) {
            Log.d("VideoOverlay", "Video overlay completed successfully.")
            promise.resolve("Video overlay completed successfully.")
        } else {
            Log.e("VideoOverlay", "Video overlay failed. Check URIs and output path.")
            promise.reject("VIDEO_OVERLAY_ERROR", "Video overlay failed due to an unknown error.")
        }
    }
}
}