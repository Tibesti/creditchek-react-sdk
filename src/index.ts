type TModules = "identity" | "income" | "credit" | "recova";
type CreditChekOptions = {
    publicKey: string;
    module: TModules[];
    onComplete: (result?: any) => void;
    onClose?: () => void;
    postMessageParam?: string;
  };
  
  const creditchekSDK = {
    open: ({ publicKey, module, onComplete, onClose, postMessageParam = "result" }: CreditChekOptions) => {
      var url = 
          "https://securedwidget.creditchek.africa/"+
          `?publicKey=${encodeURIComponent(publicKey||"")}`+
          `&module=${module?.join(",")}`+
          `&source=react`;
      const win = window.open(url, '_blank');
  
      // Listen for postMessage from the widget
      const messageHandler = (event: MessageEvent) => {
        // Verify origin for security
        if (event.origin === 'https://securedwidget.creditchek.africa') {
          if (event.data && typeof event.data === 'object') {
            // Check if the specified parameter exists in the message
            if (postMessageParam && event.data[postMessageParam] !== undefined) {
              // Clean up listener
              window.removeEventListener('message', messageHandler);
              clearInterval(interval);
              
              // Pass the result to onComplete
              onComplete(event.data);
            }
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
  
      // Fallback: Check if window is closed (for demo purposes)
      const interval = setInterval(() => {
        if (win?.closed) {
          clearInterval(interval);
          window.removeEventListener('message', messageHandler);
          onClose?.();
        }
      }, 500);
    },
  };
  
  export default creditchekSDK;