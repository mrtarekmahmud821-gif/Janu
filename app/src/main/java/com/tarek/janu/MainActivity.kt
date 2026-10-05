package com.tarek.janu

import android.Manifest
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognizerIntent
import android.speech.tts.TextToSpeech
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private lateinit var tts: TextToSpeech
    private lateinit var tvResponse: TextView
    private lateinit var btnSpeak: Button
    private lateinit var btnLock: Button

    private val userName = "Tarek"
    private val assistantName = "Janu"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvResponse = findViewById(R.id.tvResponse)
        btnSpeak = findViewById(R.id.btnSpeak)
        btnLock = findViewById(R.id.btnLock)

        tts = TextToSpeech(this, this)

        btnSpeak.setOnClickListener { startListening() }
        btnLock.setOnClickListener { lockPhone() }

        speak("হ্যালো $userName, আমি $assistantName। বলুন কী করতে পারি?")
    }

    private fun startListening() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), 100)
            return
        }

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "bn-BD")
            putExtra(RecognizerIntent.EXTRA_PROMPT, "বলুন $assistantName...")
        }
        try {
            startActivityForResult(intent, 200)
        } catch (e: Exception) {
            Toast.makeText(this, "স্পিচ রিকগনিশন সাপোর্ট করে না", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 200 && resultCode == RESULT_OK) {
            val results = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            val spokenText = results?.get(0)?.lowercase(Locale.getDefault()) ?: return
            tvResponse.text = "আপনি: $spokenText"
            handleCommand(spokenText)
        }
    }

    private fun handleCommand(text: String) {
        val response = when {
            text.contains("কেমন আছ") || text.contains("how are you") ->
                "আমি ভালো আছি $userName। আপনি কেমন আছেন?"

            text.contains("নাম কি") || text.contains("who are you") || text.contains("তোমার নাম") ->
                "আমার নাম $assistantName। আমি আপনার ব্যক্তিগত অ্যাসিস্ট্যান্ট।"

            text.contains("সময়") || text.contains("time") -> {
                val time = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())
                "এখন সময় $time"
            }

            text.contains("তারিখ") || text.contains("date") -> {
                val date = SimpleDateFormat("dd MMMM yyyy", Locale.getDefault()).format(Date())
                "আজকের তারিখ $date"
            }

            text.contains("লক") || text.contains("lock") -> {
                lockPhone()
                return
            }

            text.contains("ধন্যবাদ") || text.contains("thank") ->
                "আপনাকেও ধন্যবাদ $userName।"

            text.contains("বাই") || text.contains("bye") || text.contains("বিদায়") ->
                "আল্লাহ হাফেজ $userName। পরে কথা হবে।"

            else -> "দুঃখিত $userName, আমি এখনো এটা শিখিনি। অন্য কিছু বলুন।"
        }
        speak(response)
        tvResponse.text = response
    }

    private fun lockPhone() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val component = ComponentName(this, AdminReceiver::class.java)

        if (dpm.isAdminActive(component)) {
            dpm.lockNow()
            speak("ঠিক আছে $userName, ফোন লক করে দিলাম।")
        } else {
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, component)
                putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Janu-কে ফোন লক করার অনুমতি দিন")
            }
            startActivity(intent)
        }
    }

    private fun speak(text: String) {
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, null)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts.language = Locale("bn", "BD")
        }
    }

    override fun onDestroy() {
        if (::tts.isInitialized) {
            tts.stop()
            tts.shutdown()
        }
        super.onDestroy()
    }
}
