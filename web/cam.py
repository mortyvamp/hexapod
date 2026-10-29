from picamera2 import Picamera2
import cv2
import threading
import time

class CamStream:
    def __init__(self, src = 0):
        print("init")
        self.picam2 = Picamera2()
        self.picam2.configure(self.picam2.create_video_configuration(main={"size": (1280,720), "format": "BGR888"}))
        self.picam2.set_controls({"FrameRate": 30})
        self.picam2.start()
        raw_frame = self.picam2.capture_array()
        self.frame = cv2.cvtColor(raw_frame, cv2.COLOR_RGB2BGR)
        
        self.grabbed = True if self.frame is not None else False
        self.stopped = False
        self.lock = threading.Lock()
    
    def start(self):
        print("start thread")
        t = threading.Thread(target=self.update, args=())
        t.daemon = True
        t.start()
        return self
    
    def update(self):
        print("read")
        while True:
            if self.stopped:
                return
            
            try:
                raw_frame = self.picam2.capture_array()
                bgr_frame = cv2.cvtColor(raw_frame, cv2.COLOR_RGB2BGR)
                with self.lock:
                    self.frame = bgr_frame
                    self.grabbed = True
                time.sleep(0.01)
            except Exception:
                continue
    
    def read(self):
        with self.lock:
            return self.frame
    
    def stop(self):
        self.stopped = True
        self.picam2.stop()
