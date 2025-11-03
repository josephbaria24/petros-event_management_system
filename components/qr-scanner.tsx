import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase-client';
import jsQR from 'jsqr';

export function QRScanner({ eventId }: { eventId: string }) {
  const [scanning, setScanning] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<{
    status: 'success' | 'error' | 'info';
    message: string;
    name?: string;
    time: Date;
  } | null>(null);
  const [recentScans, setRecentScans] = useState<Array<{
    id: number;
    name: string;
    status: 'success' | 'duplicate';
    time: Date;
  }>>([]);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // Check for camera permissions on mount
  useEffect(() => {
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not available. Please use HTTPS or localhost.');
      setPermissionStatus('denied');
      return;
    }

    checkCameraPermission();
    enumerateCameras();
    
    return () => {
      stopScanning();
    };
  }, []);

  const checkCameraPermission = async () => {
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissionStatus(result.state as 'prompt' | 'granted' | 'denied');
        
        result.addEventListener('change', () => {
          setPermissionStatus(result.state as 'prompt' | 'granted' | 'denied');
        });
      }
    } catch (error) {
      console.log('Permission API not supported');
    }
  };

  const enumerateCameras = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.log('enumerateDevices not supported');
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(cameras);
      
      // Select back camera by default if available
      const backCamera = cameras.find(camera => 
        camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('rear')
      );
      if (backCamera) {
        setSelectedCamera(backCamera.deviceId);
      } else if (cameras.length > 0) {
        setSelectedCamera(cameras[0].deviceId);
      }
    } catch (error) {
      console.error('Error enumerating cameras:', error);
    }
  };

  const startScanning = async () => {
    setCameraError(null);
    
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = 'Camera access is not available. This feature requires:\n• HTTPS connection (or localhost for development)\n• A modern browser with camera support';
      setCameraError(errorMsg);
      setLastScan({
        status: 'error',
        message: errorMsg,
        time: new Date()
      });
      return;
    }
    
    try {
      // Request camera permission
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      // If a specific camera is selected, use it
      if (selectedCamera) {
        constraints.video = {
          deviceId: { exact: selectedCamera },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        };
      }

      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera access granted, stream obtained');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          console.log('Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
          
          videoRef.current?.play().then(() => {
            console.log('Video playing successfully');
            setScanning(true);
            setPermissionStatus('granted');
            
            // Start scanning for QR codes
            scanIntervalRef.current = window.setInterval(() => {
              captureAndDecode();
            }, 300); // Scan every 300ms
          }).catch(err => {
            console.error('Error playing video:', err);
            setCameraError('Failed to play video stream');
          });
        };

        // Handle video errors
        videoRef.current.onerror = (e) => {
          console.error('Video error:', e);
          setCameraError('Video stream error occurred');
        };
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      setScanning(false);
      
      let errorMessage = 'Failed to access camera. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Camera permission was denied. Please allow camera access in your browser settings.';
        setPermissionStatus('denied');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Camera is already in use by another application. Please close other apps using the camera.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += 'Camera does not meet requirements. Trying with default settings...';
        // Retry with basic constraints
        retryWithBasicConstraints();
        return;
      } else if (error.name === 'TypeError') {
        errorMessage += 'Invalid camera configuration.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }
      
      setCameraError(errorMessage);
      setLastScan({
        status: 'error',
        message: errorMessage,
        time: new Date()
      });
    }
  };

  const retryWithBasicConstraints = async () => {
    try {
      console.log('Retrying with basic constraints...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            console.log('Video playing with basic constraints');
            setScanning(true);
            setCameraError(null);
            
            scanIntervalRef.current = window.setInterval(() => {
              captureAndDecode();
            }, 300);
          });
        };
      }
    } catch (error: any) {
      console.error('Retry failed:', error);
      setCameraError('Unable to access camera even with basic settings.');
    }
  };

  const stopScanning = () => {
    console.log('Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
    lastScannedRef.current = '';
  };

  const captureAndDecode = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    if (canvas.width === 0 || canvas.height === 0) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    try {
      const code = detectQRCode(imageData);
      if (code && code.data) {
        const now = Date.now();
        // Prevent duplicate scans within 3 seconds
        if (code.data !== lastScannedRef.current || now - lastScanTimeRef.current > 3000) {
          lastScannedRef.current = code.data;
          lastScanTimeRef.current = now;
          console.log('QR Code detected:', code.data);
          await processQRCode(code.data);
        }
      }
    } catch (error) {
      // Silent fail for scanning attempts
    }
  };

  const detectQRCode = (imageData: ImageData) => {
    return jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
  };

  const processQRCode = async (referenceId: string) => {
    try {
      console.log('Processing QR code for reference_id:', referenceId);
      
      // Fetch attendee by reference_id
      const { data: attendee, error: fetchError } = await supabase
        .from('attendees')
        .select('*')
        .eq('reference_id', referenceId)
        .eq('event_id', parseInt(eventId))
        .single();

      if (fetchError || !attendee) {
        console.error('Attendee not found:', fetchError);
        setLastScan({
          status: 'error',
          message: 'Attendee not found or not registered for this event',
          time: new Date()
        });
        return;
      }

      console.log('Attendee found:', attendee);

      // Get current date (today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEpoch = today.getTime();

      // Check if already marked present today
      const attendance = attendee.attendance || [];
      const todayAttendance = attendance.find((a: any) => a.date === todayEpoch);

      if (todayAttendance && todayAttendance.status === 'Present') {
        console.log('Already marked present today');
        setLastScan({
          status: 'info',
          message: `${attendee.personal_name} ${attendee.last_name} is already marked present today`,
          name: `${attendee.personal_name} ${attendee.last_name}`,
          time: new Date()
        });
        setRecentScans(prev => [{
          id: attendee.id,
          name: `${attendee.personal_name} ${attendee.last_name}`,
          status: 'duplicate',
          time: new Date()
        }, ...prev.slice(0, 9)]);
        return;
      }

      // Mark as present
      const updatedAttendance = attendance.filter((a: any) => a.date !== todayEpoch);
      updatedAttendance.push({ date: todayEpoch, status: 'Present' });

      console.log('Updating attendance...');
      const { error: updateError } = await supabase
        .from('attendees')
        .update({ attendance: updatedAttendance })
        .eq('id', attendee.id);

      if (updateError) {
        console.error('Failed to update attendance:', updateError);
        setLastScan({
          status: 'error',
          message: 'Failed to update attendance',
          time: new Date()
        });
        return;
      }

      // Success
      console.log('Attendance marked successfully');
      const attendeeName = `${attendee.personal_name} ${attendee.last_name}`;
      setLastScan({
        status: 'success',
        message: `Successfully marked ${attendeeName} as present`,
        name: attendeeName,
        time: new Date()
      });
      setRecentScans(prev => [{
        id: attendee.id,
        name: attendeeName,
        status: 'success',
        time: new Date()
      }, ...prev.slice(0, 9)]);

      // Play success sound
      playSuccessSound();

    } catch (error) {
      console.error('Error processing QR code:', error);
      setLastScan({
        status: 'error',
        message: 'An error occurred while processing the QR code',
        time: new Date()
      });
    }
  };

  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.log('Could not play sound');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">QR Attendance Scanner</h1>
          <p className="text-muted-foreground mt-1">
            Scan attendee QR codes to mark them present for today
          </p>
        </div>
      </div>

      {permissionStatus === 'denied' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Camera access is blocked. Please enable camera permissions in your browser settings and reload the page.
          </AlertDescription>
        </Alert>
      )}

      {cameraError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Camera Not Available</div>
            <div className="text-sm whitespace-pre-line">{cameraError}</div>
            <div className="mt-3 text-sm">
              <strong>For development:</strong> Make sure you're accessing via <code className="bg-black/10 px-1 rounded">localhost</code>
            </div>
            <div className="mt-1 text-sm">
              <strong>For production:</strong> Make sure your site uses HTTPS
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Scanner Card */}
        <Card>
          <CardHeader>
            <CardTitle>Camera Scanner</CardTitle>
            <CardDescription>
              Position the QR code in front of the camera
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {scanning ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-4 border-green-500 rounded-lg w-64 h-64 animate-pulse shadow-lg shadow-green-500/50" />
                  </div>
                  
                  {/* Scanning status indicator */}
                  <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Scanning...
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                  <Camera className="h-16 w-16 text-muted-foreground" />
                  {cameraError && (
                    <p className="text-sm text-center text-red-400">{cameraError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Camera Selection */}
            {availableCameras.length > 1 && !scanning && (
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {availableCameras.map(camera => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            )}

            <Button
              onClick={scanning ? stopScanning : startScanning}
              className="w-full"
              variant={scanning ? 'destructive' : 'default'}
              disabled={permissionStatus === 'denied'}
            >
              {scanning ? (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Stop Scanning
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Start Scanning
                </>
              )}
            </Button>

            {lastScan && (
              <Alert 
                variant={lastScan.status === 'error' ? 'destructive' : 'default'}
                className={
                  lastScan.status === 'success' 
                    ? 'border-green-500 bg-green-50' 
                    : lastScan.status === 'info'
                    ? 'border-blue-500 bg-blue-50'
                    : ''
                }
              >
                {lastScan.status === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                {lastScan.status === 'error' && <XCircle className="h-4 w-4" />}
                {lastScan.status === 'info' && <AlertCircle className="h-4 w-4 text-blue-600" />}
                <AlertDescription>
                  <div className="font-medium">{lastScan.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatTime(lastScan.time)}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Recent Scans Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
            <CardDescription>
              Latest scanned attendees for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentScans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No scans yet. Start scanning to see results here.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {recentScans.map((scan, index) => (
                  <div
                    key={`${scan.id}-${index}`}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      scan.status === 'success'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {scan.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <RefreshCw className="h-5 w-5 text-blue-600" />
                      )}
                      <div>
                        <div className="font-medium">{scan.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(scan.time)}
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs font-medium px-2 py-1 rounded ${
                      scan.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {scan.status === 'success' ? 'Marked Present' : 'Already Present'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Allow camera access when prompted by your browser</li>
            <li>Click "Start Scanning" to activate the camera</li>
            <li>Position the attendee's QR code within the green frame</li>
            <li>The system will automatically scan and mark attendance</li>
            <li>Each attendee can only be marked present once per day</li>
            <li>Recent scans will appear in the right panel</li>
          </ol>
          
          {cameraError && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-900 mb-2">Troubleshooting Tips:</p>
              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                <li>Make sure no other app is using your camera</li>
                <li>Check if camera permissions are enabled in browser settings</li>
                <li>Try refreshing the page</li>
                <li>Make sure you're using HTTPS (required for camera access)</li>
                <li>For mobile testing, use ngrok to create an HTTPS tunnel</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}