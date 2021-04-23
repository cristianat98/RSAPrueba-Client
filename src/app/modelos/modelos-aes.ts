export class keyAES {
    clave: CryptoKey

    constructor(){
    }

    async setup(claveHex?: Uint8Array){
        if (claveHex !== undefined){
            this.clave = await crypto.subtle.importKey(
                "raw",
                claveHex,
                "AES-GCM",
                true,
                ["encrypt", "decrypt"]
              )
        }

        else{
            this.clave = await crypto.subtle.generateKey(
                {
                  name: "AES-GCM",
                  length: 256
                },
                true,
                ["encrypt", "decrypt"]
            );
        }
    }
}
