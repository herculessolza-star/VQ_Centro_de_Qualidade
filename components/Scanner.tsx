
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
// Added ShieldCheck to the imports from lucide-react
import { X, RefreshCw, Zap, ZapOff, Camera, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

interface ScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const [status, setStatus] = useState<'requesting' | 'loading' | 'scanning' | 'error' | 'permission-denied'>('requesting');
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "custom-reader";

  const requestPermissionAndStart = async () => {
    setStatus('loading');
    try {
      // Tenta obter as câmeras primeiro para disparar o prompt de permissão do navegador
      const cameras = await Html5Qrcode.getCameras();
      
      if (cameras && cameras.length > 0) {
        // Se temos câmeras, iniciamos o scanner
        startScanner();
      } else {
        setStatus('error');
        setErrorMessage('Nenhuma câmera encontrada no dispositivo.');
      }
    } catch (err: any) {
      console.error("Erro de permissão ou acesso:", err);
      if (err.toString().includes("NotAllowedError") || err.toString().includes("Permission denied")) {
        setStatus('permission-denied');
      } else {
        setStatus('error');
        setErrorMessage('Não foi possível acessar a câmera. Verifique se outra aba está usando-a.');
      }
    }
  };

  const startScanner = async (facingMode: "user" | "environment" = "environment") => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 25,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE, 
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.CODE_39
        ]
      };

      await html5QrCode.start(
        { facingMode },
        config,
        (decodedText) => {
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          onScan(decodedText);
          stopScanner();
        },
        () => {
          // Scanning...
        }
      );

      setStatus('scanning');
      
      // Check for torch/flash capability
      const track = html5QrCode.getRunningTrack();
      if (track && track.getCapabilities) {
        const capabilities = track.getCapabilities() as any;
        setHasFlash(!!capabilities.torch);
      }
    } catch (err) {
      console.error("Erro ao iniciar scanner:", err);
      if (facingMode === "environment") {
        startScanner("user");
      } else {
        setStatus('error');
        setErrorMessage('Falha ao inicializar o motor de captura.');
      }
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        console.error("Erro ao parar scanner", e);
      }
    }
    onClose();
  };

  const toggleFlash = async () => {
    if (html5QrCodeRef.current && hasFlash) {
      const newState = !isFlashOn;
      try {
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: newState }] as any
        });
        setIsFlashOn(newState);
      } catch (e) {
        console.error("Erro ao alternar flash", e);
      }
    }
  };

  const switchCamera = () => {
    const track = html5QrCodeRef.current?.getRunningTrack();
    const settings = track?.getSettings();
    const nextMode = settings?.facingMode === "environment" ? "user" : "environment";
    startScanner(nextMode as any);
  };

  useEffect(() => {
    // Inicia automaticamente o processo de pedido de câmera
    requestPermissionAndStart();
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-500">
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg">
            <Camera size={20} />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-tighter text-lg leading-tight">Scanner VQ Pro</h3>
            <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest">Tecnologia de Captura BYD</p>
          </div>
        </div>
        <button 
          onClick={stopScanner}
          className="w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-rose-500 transition-all active:scale-90"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Scanner Area */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {status === 'scanning' && <div id={scannerId} className="w-full h-full object-cover"></div>}
        
        {/* States Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center bg-slate-950/20">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 animate-in zoom-in-95">
              <Loader2 size={64} className="text-indigo-500 animate-spin" />
              <p className="text-white font-black uppercase tracking-[0.2em] text-xs">Iniciando Câmera...</p>
            </div>
          )}

          {status === 'permission-denied' && (
            <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-xs space-y-6 animate-in slide-in-from-bottom-8">
              <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck size={40} />
              </div>
              <h4 className="text-xl font-black text-slate-800 uppercase italic leading-tight">Permissão Negada</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">O acesso à câmera foi bloqueado. Ative as permissões nas configurações do seu navegador para usar o scanner.</p>
              <button onClick={requestPermissionAndStart} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-indigo-100">
                Tentar Novamente
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-xs space-y-6 animate-in slide-in-from-bottom-8">
              <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={40} />
              </div>
              <h4 className="text-xl font-black text-slate-800 uppercase italic leading-tight">Erro de Acesso</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">{errorMessage}</p>
              <button onClick={requestPermissionAndStart} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-indigo-100">
                Reiniciar Câmera
              </button>
            </div>
          )}

          {status === 'scanning' && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="relative w-[280px] h-[280px]">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>
                
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-scan-line"></div>
              </div>
              <div className="mt-12 px-8 py-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                 <p className="text-white text-[11px] font-black uppercase tracking-[0.3em] animate-pulse">Lendo VIN...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      {status === 'scanning' && (
        <div className="absolute bottom-12 flex items-center gap-8 z-20">
          {hasFlash && (
            <button 
              onClick={toggleFlash}
              className={`w-16 h-16 flex flex-col items-center justify-center rounded-2xl transition-all active:scale-95 border-2 ${isFlashOn ? 'bg-amber-500 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-white/10 border-white/10 text-white backdrop-blur-md'}`}
            >
              {isFlashOn ? <Zap size={24} /> : <ZapOff size={24} />}
              <span className="text-[9px] font-black uppercase mt-1 tracking-tighter">{isFlashOn ? 'On' : 'Off'}</span>
            </button>
          )}
          
          <button 
            onClick={switchCamera}
            className="w-16 h-16 flex flex-col items-center justify-center bg-white/10 backdrop-blur-md border-2 border-white/10 rounded-2xl text-white hover:bg-white/20 transition-all active:scale-95"
          >
            <RefreshCw size={24} />
            <span className="text-[9px] font-black uppercase mt-1 tracking-tighter">Girar</span>
          </button>
        </div>
      )}

      <style>{`
        #${scannerId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        @keyframes scan-line {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Scanner;
