type TModules = "identity" | "income" | "credit" | "recova";
type CreditChekOptions = {
    publicKey: string;
    module: TModules[];
    onComplete: (result?: any) => void;
    onClose?: () => void;
    postMessageParam?: string;
};
declare const creditchekSDK: {
    open: ({ publicKey, module, onComplete, onClose, postMessageParam }: CreditChekOptions) => void;
};
export default creditchekSDK;
