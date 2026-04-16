declare module "backblaze-b2" {
  interface B2ClientOptions {
    applicationKeyId: string;
    applicationKey: string;
  }

  interface AuthorizeResponse {
    data: {
      downloadUrl: string;
    };
  }

  interface UploadUrlResponse {
    data: {
      uploadUrl: string;
      authorizationToken: string;
    };
  }

  export default class B2 {
    constructor(options: B2ClientOptions);
    authorize(): Promise<AuthorizeResponse>;
    getUploadUrl(params: { bucketId: string }): Promise<UploadUrlResponse>;
    uploadFile(params: {
      uploadUrl: string;
      uploadAuthToken: string;
      fileName: string;
      data: Buffer;
      mime?: string;
      contentLength?: number;
      hash?: string;
    }): Promise<unknown>;
  }
}
