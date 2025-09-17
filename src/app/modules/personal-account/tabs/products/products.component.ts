import { Component, OnInit } from '@angular/core';
import { ProductsService } from './products.service';

@Component({
  selector: 'app-products',
  imports: [],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit{

  constructor(private productsService:ProductsService){}

  ngOnInit(): void {
    this.productsService.getProducts([],0,30).subscribe((data:any)=>{
      console.log('data',data);
    })
  }

}
