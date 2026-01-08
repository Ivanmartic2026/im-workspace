import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, MapPin } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function RoutePlayback({ routeData }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);

  const points = routeData?.points || [];
  const visiblePoints = points.slice(0, currentIndex + 1);

  useEffect(() => {
    if (!isPlaying || currentIndex >= points.length - 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= points.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, points.length, speed]);

  const handleReset = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const handleSliderChange = (value) => {
    setCurrentIndex(value[0]);
    setIsPlaying(false);
  };

  if (!points || points.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Ingen ruttdata tillgänglig</p>
        </CardContent>
      </Card>
    );
  }

  const currentPoint = points[currentIndex];
  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  return (
    <div className="space-y-4">
      {/* Map */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="h-96">
          <MapContainer
            center={[currentPoint.lat, currentPoint.lon]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            
            {/* Traveled route */}
            <Polyline
              positions={visiblePoints.map(p => [p.lat, p.lon])}
              color="#3b82f6"
              weight={4}
            />
            
            {/* Remaining route (faded) */}
            {currentIndex < points.length - 1 && (
              <Polyline
                positions={points.slice(currentIndex).map(p => [p.lat, p.lon])}
                color="#cbd5e1"
                weight={2}
                dashArray="5, 10"
              />
            )}

            {/* Start marker */}
            <Marker position={[startPoint.lat, startPoint.lon]}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold">Start</p>
                  <p className="text-xs text-slate-500">{startPoint.time}</p>
                </div>
              </Popup>
            </Marker>

            {/* Current position marker */}
            <Marker 
              position={[currentPoint.lat, currentPoint.lon]}
              icon={L.divIcon({
                html: `<div style="background: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
                className: 'custom-marker',
                iconSize: [16, 16],
              })}
            >
              <Popup>
                <div className="text-center">
                  <p className="font-semibold">Nuvarande position</p>
                  <p className="text-xs text-slate-500">{currentPoint.time}</p>
                  <p className="text-xs text-slate-500">{currentPoint.speed} km/h</p>
                </div>
              </Popup>
            </Marker>

            {/* End marker */}
            {currentIndex >= points.length - 1 && (
              <Marker position={[endPoint.lat, endPoint.lon]}>
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">Slut</p>
                    <p className="text-xs text-slate-500">{endPoint.time}</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </Card>

      {/* Controls */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          {/* Info bar */}
          <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-slate-200">
            <div>
              <p className="text-xs text-slate-500">Tid</p>
              <p className="text-sm font-semibold text-slate-900">{currentPoint.time}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Hastighet</p>
              <p className="text-sm font-semibold text-slate-900">{currentPoint.speed} km/h</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Framsteg</p>
              <p className="text-sm font-semibold text-slate-900">
                {Math.round((currentIndex / (points.length - 1)) * 100)}%
              </p>
            </div>
          </div>

          {/* Timeline slider */}
          <div className="mb-4">
            <Slider
              value={[currentIndex]}
              min={0}
              max={points.length - 1}
              step={1}
              onValueChange={handleSliderChange}
              className="w-full"
            />
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={currentIndex >= points.length - 1}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Hastighet:</span>
              {[0.5, 1, 2, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    speed === s
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}