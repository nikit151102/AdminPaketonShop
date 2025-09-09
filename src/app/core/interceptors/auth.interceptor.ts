import { HttpHandler, HttpRequest, HttpInterceptor } from "@angular/common/http";
import { StorageUtils } from "../../../utils/storage.utils";
import { Injectable } from "@angular/core";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const authReq = req.clone({
      setHeaders: { 
        Authorization: `Bearer ${StorageUtils.getLocalStorageCache('authToken')}` 
      }
    });
    return next.handle(authReq);
  }
} 