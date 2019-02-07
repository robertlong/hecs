import { ComponentConstructor} from "./Component";

export class Query {
  id: number;

  constructor(params: { with?: ComponentConstructor[], without?: ComponentConstructor[] }) {

  }

  *entities() {
    
  }

  *changed() {

  }

  *added() {

  } 

  *removed() {

  }
}

// class MySystem {
//   world: World

//   constructor() {
//     this.query = new Query({
//       with: TransformComponent
//     });
//   }

//   update() {
//     for (let entity of this.query.entities()) {

//     }
//   }
// }