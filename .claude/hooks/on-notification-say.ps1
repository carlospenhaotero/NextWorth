# Lee el payload de stdin
$payload = [Console]::In.ReadToEnd()

# Parsea el JSON y extrae el mensaje
$jsonObject = $payload | ConvertFrom-Json
$message = $jsonObject.message

# Usa el sintetizador de voz de Windows
Add-Type -AssemblyName System.Speech
$synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synthesizer.Speak($message)