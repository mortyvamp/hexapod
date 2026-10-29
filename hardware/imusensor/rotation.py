import time
import math
from mpu6050 import mpu6050
from adafruit_servokit import ServoKit

#init PCA9685
kit = ServoKit(channels=16)
servo = kit.servo[0]

#init IMU sensor
imu = mpu6050(0x68)

#config
position_x = 0.0
velocity_x = 0.0
accel_bias = 0.0
ACCEL_DEADZONE = 0.15

samples = []
for _ in range(50):
	samples.append(imu.get_accel_data()['x'])
	time.sleep(0.02)
accel_bias = sum(samples) / len(samples)

last_time = time.time()

try:
	while True:
		current_time = time.time()
		dt = current_time - last_time
		last_time = current_time
		
		accel_data = imu.get_accel_data()
		clean_accel = accel_data['x'] - accel_bias
		
		if abs(clean_accel) < ACCEL_DEADZONE:
			clean_accel = 0.0
			velocity_x *= 0.92
			if abs(velocity_x) < 0.01:
				velocity_x = 0.0
		
		else:
			velocity_x += clean_accel * dt
			
		position_x += velocity_x * dt
		
		
		ay = accel_data['y']
		az = accel_data['z']
		
		tilt_angle_rad = math.atan2(ay, math.sqrt(clean_accel**2 + az**2))
		tilt_angle_deg = math.degrees(tilt_angle_rad)
		
		target_angle = 90 + tilt_angle_deg
		
		if target_angle < 0: target_angle = 0
		elif target_angle > 180: target_angle = 180
		
		
		servo.angle = target_angle
		
		pos_cm = position_x * 100
		print(f"Position: {pos_cm:5.1f} cm | Board Tilt: {tilt_angle_deg:6.1f} degrees | Servo: {target_angle:5.1f} degrees", end="\r")
		
		time.sleep(0.02)
		
except KeyboardInterrupt:
	servo.angle = 90
