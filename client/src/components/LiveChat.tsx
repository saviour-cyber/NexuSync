import { openWhatsApp } from "@/utils/openWhatsApp";
import { LeadCaptureDialog } from "@/components/LeadCaptureDialog";
import { WHATSAPP_NUMBER } from "@/config/whatsapp";
import { useState, useEffect } from "react"; // Added useState and useEffect
import { AnimatePresence, motion } from "framer-motion"; // Added AnimatePresence and motion
import { X, CheckCheck } from "lucide-react"; // Added X and CheckCheck

const WHATSAPP_MSG = "Hello NexaSync, I'm interested in your services.";

export function LiveChat() {
    const [open, setOpen] = useState(false);
    const [hasOpened, setHasOpened] = useState(false);
    const [showLeadDialog, setShowLeadDialog] = useState(false);

    // Auto open after 10 seconds if not already opened
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!hasOpened) {
                setOpen(true);
                setHasOpened(true);
            }
        }, 10000);
        return () => clearTimeout(timer);
    }, [hasOpened]);

    const handleOpen = () => {
        setOpen(!open);
        setHasOpened(true);
    };

    const handleWhatsApp = () => {
        setShowLeadDialog(true);
        // We can close the chat widget if desired, or keep it open behind the dialog
        setOpen(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ duration: 0.25, type: "spring", stiffness: 300, damping: 25 }}
                        className="bg-[#efeae2] rounded-2xl shadow-2xl w-[320px] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-[#075e54] p-4 text-white flex items-center gap-3">
                            <div className="relative">
                                {/* Auto-generate an avatar using UI Avatars */}
                                <img
                                    src="https://ui-avatars.com/api/?name=Nexa+Sync&background=25D366&color=fff&rounded=true&bold=true"
                                    alt="NexaSync"
                                    className="w-10 h-10 rounded-full border-2 border-[#128c7e]"
                                />
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#075e54] rounded-full"></span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-semibold text-base leading-tight">NexaSync Support</span>
                                <span className="text-white/80 text-xs">Typically replies in minutes</span>
                            </div>
                            <button onClick={() => setOpen(false)} className="ml-auto text-white/80 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Chat Body (WhatsApp background style) */}
                        <div
                            className="p-4 flex flex-col gap-3 min-h-[160px] relative"
                            style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundSize: 'contain' }}
                        >
                            {/* Chat bubble */}
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white p-3 rounded-b-xl rounded-tr-xl rounded-tl-sm shadow-sm self-start max-w-[85%] relative text-sm text-slate-800"
                            >
                                <p className="mb-1">👋 Hi there!</p>
                                <p>How can NexaSync help you today? Let us know if you need a quote or have any questions.</p>
                                <div className="text-[10px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1">
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                                </div>
                            </motion.div>
                        </div>

                        {/* Footer Button */}
                        <div className="bg-white p-3">
                            <button
                                onClick={handleWhatsApp}
                                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128c7e] text-white font-semibold py-3 rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
                                </svg>
                                Start Chat on WhatsApp
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle button with pulse animation */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOpen}
                className="relative w-16 h-16 rounded-full bg-[#25D366] hover:bg-[#128c7e] text-white shadow-xl flex items-center justify-center transition-colors z-50 group"
                aria-label="Toggle WhatsApp chat"
            >
                {/* Pulse ring effect */}
                {!open && (
                    <span className="absolute w-full h-full rounded-full border-4 border-[#25D366] opacity-60 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></span>
                )}

                {open ? (
                    <X className="w-8 h-8" />
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
                    </svg>
                )}
            </motion.button>

            <LeadCaptureDialog
                isOpen={showLeadDialog}
                onClose={() => setShowLeadDialog(false)}
            />
        </div>
    );
}
