package com.reelzzz_app

import android.content.Context
import android.media.*
import android.net.Uri
import android.util.Log
import java.io.File
import java.io.IOException
import java.nio.ByteBuffer

class VideoOverlay(private val context: Context) {

    fun overlayVideos(param1VideoUri: Uri, uploadedVideoUri: Uri, outputFilePath: String, onComplete: (Boolean) -> Unit) {
        val outputFile = File(outputFilePath)
        if (!outputFile.parentFile.exists()) {
            outputFile.parentFile.mkdirs() // Ensure directory exists
            Log.d("VideoOverlay", "Created directories for output file.")
        }

        var param1Extractor: MediaExtractor? = null
        var uploadedExtractor: MediaExtractor? = null
        var muxer: MediaMuxer? = null

        try {
            Log.d("VideoOverlay", "Starting video overlay: param1VideoUri=$param1VideoUri, uploadedVideoUri=$uploadedVideoUri")

            // Initialize extractors
            param1Extractor = MediaExtractor().apply { setDataSource(context, param1VideoUri, null) }
            uploadedExtractor = MediaExtractor().apply { setDataSource(context, uploadedVideoUri, null) }

            // Initialize muxer
            muxer = MediaMuxer(outputFilePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

            // Select video and audio tracks
            val param1TrackIndex = selectTrack(param1Extractor, "video/")
            val uploadedTrackIndex = selectTrack(uploadedExtractor, "audio/")

            if (param1TrackIndex == -1 || uploadedTrackIndex == -1) {
                Log.e("VideoOverlay", "No valid video or audio tracks found.")
                onComplete(false)
                return
            }

            param1Extractor.selectTrack(param1TrackIndex)
            uploadedExtractor.selectTrack(uploadedTrackIndex)

            val param1Format = param1Extractor.getTrackFormat(param1TrackIndex)
            val uploadedFormat = uploadedExtractor.getTrackFormat(uploadedTrackIndex)

            val videoTrackIndex = muxer.addTrack(param1Format)
            val audioTrackIndex = muxer.addTrack(uploadedFormat)

            // Start the muxer
            muxer.start()

            // Write track data
            writeTrackData(param1Extractor, muxer, videoTrackIndex)
            writeTrackData(uploadedExtractor, muxer, audioTrackIndex)

            Log.d("VideoOverlay", "Video overlay completed successfully")
            onComplete(true)

        } catch (e: IOException) {
            Log.e("VideoOverlay", "IO Error during video overlay: ${e.message}", e)
            onComplete(false)
        } catch (e: IllegalArgumentException) {
            Log.e("VideoOverlay", "Error during video overlay: ${e.message}", e)
            onComplete(false)
        } catch (e: Exception) {
            Log.e("VideoOverlay", "Unexpected error during video overlay: ${e.message}", e)
            onComplete(false)
        } finally {
            // Release resources
            try {
                param1Extractor?.release()
                uploadedExtractor?.release()
                muxer?.stop()
                muxer?.release()
            } catch (e: Exception) {
                Log.e("VideoOverlay", "Error releasing resources: ${e.message}", e)
            }
        }
    }

    private fun selectTrack(extractor: MediaExtractor, mimePrefix: String): Int {
        for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME)
            if (mime?.startsWith(mimePrefix) == true) {
                Log.d("VideoOverlay", "Selected track index: $i with mime type: $mime")
                return i
            }
        }
        return -1 // No valid track found
    }

    private fun writeTrackData(extractor: MediaExtractor, muxer: MediaMuxer, trackIndex: Int) {
        val buffer = ByteBuffer.allocate(1024 * 1024) // 1 MB buffer size
        val bufferInfo = MediaCodec.BufferInfo()

        while (true) {
            bufferInfo.offset = 0
            bufferInfo.size = extractor.readSampleData(buffer, 0)

            if (bufferInfo.size < 0) {
                Log.d("VideoOverlay", "End of stream for track index: $trackIndex")
                break
            }

            bufferInfo.presentationTimeUs = extractor.sampleTime
            bufferInfo.flags = extractor.sampleFlags

            muxer.writeSampleData(trackIndex, buffer, bufferInfo)

            Log.d("VideoOverlay", "Writing data for track index $trackIndex at time ${bufferInfo.presentationTimeUs}")

            extractor.advance()
        }
    }
}