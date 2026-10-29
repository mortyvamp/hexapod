import time
import RPi.GPIO as GPIO

SIG_PIN = 17
GPIO.setmode(GPIO.BCM)
DETECTION_THRESHOLD_CM = 30.0

try:
	while True:
		GPIO.setup(SIG_PIN, GPIO.OUT)
		GPIO.output(SIG_PIN, GPIO.LOW)
		time.sleep(0.000002)
		GPIO.output(SIG_PIN, GPIO.HIGH)
		time.sleep(0.00001)
		GPIO.output(SIG_PIN, GPIO.LOW)
		
		GPIO.setup(SIG_PIN, GPIO.IN)
		
		start_time = time.time()
		timeout = start_time + 0.04
		
		while GPIO.input(SIG_PIN) == GPIO.LOW:
			start_time = time.time()
			if start_time > timeout:
				break
				
		end_time = time.time()
		while GPIO.input(SIG_PIN) == GPIO.HIGH:
			end_time = time.time()
			if end_time > timeout:
				break
				
		duration = end_time - start_time
		distance_cm = (duration * 34300) / 2
		
		if 0.5 <= distance_cm <= DETECTION_THRESHOLD_CM:
			status_text = "OBJECT DETECTED"
		elif distance_cm > DETECTION_THRESHOLD_CM and distance_cm < 200.0:
			status_text = "PATH CLEAR"
		else:
			status_text = "OUT OF RANGE"
			
		bar_length = int(min(distance_cm, 0), 100) / 5
		visual_bar = "|" * bar_length + ":" * (20 - bar_length)
		
		if distance_cm < 200.0:
			print(f"{status_text}, range: {distance_cm:5.1f} cm, {visual_bar}", end="\r")
		else:
			print(f"{status_text}, Range: -- cm, NONE", end="\r")
			
		time.sleep(0.02)
		
except KeyboardInterrupt:
	print("RESETTING")
	GPIO.cleanup()
	
		
if duration > 0.035 or distance_cm < 0.5:
	print("SILENT")
else:
	print("ONLINE")
