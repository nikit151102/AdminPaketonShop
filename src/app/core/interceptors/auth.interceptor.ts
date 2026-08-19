import { HttpHandler, HttpRequest, HttpInterceptor } from "@angular/common/http";
import { StorageUtils } from "../../../utils/storage.utils";
import { Injectable } from "@angular/core";
import { localStorageEnvironment } from "../../../environment";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    let token: any = StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key);
  
    
    let authReq = req;
    
    let jwtToken: string | null = null;
    
    if (token) {
      if (typeof token === 'string') {
        jwtToken = token;
      } else if (token.data) {
        jwtToken = token.data;
      } else if (token.token) {
        jwtToken = token.token;
      }
    }
    
    if (jwtToken) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${jwtToken}`
        }
      });
    }
    
    return next.handle(authReq);
  }
}