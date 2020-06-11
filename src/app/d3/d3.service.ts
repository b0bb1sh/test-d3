import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class D3Service {

  /** This service will provide methods to enable user interaction with elements
  * while maintaining the d3 simulations physics
  */
  constructor() { }

  /** A method to bind a pan and zoom behaviour to an svg element */
  applyZoomableBehaviour() { }

  /** A method to bind a draggable behaviour to an svg element */
  applyDraggableBehaviour() { }

}
