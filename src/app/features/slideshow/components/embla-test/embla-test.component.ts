// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { EmblaCarouselDirective, EmblaCarouselType } from 'embla-carousel-angular';

// @Component({
//     selector: 'app-embla-test',
//     standalone: true,
//     imports: [CommonModule, EmblaCarouselDirective],
//     template: `
//     <div class="embla-test-container">
//       <h2>🧪 Embla Carousel Test</h2>
      
//       <div class="embla" emblaCarousel [options]="options">
//         <div class="embla__container">
//           <div class="embla__slide">
//             <div class="embla__slide__content">
//               <h3>Test Slide 1</h3>
//               <p>Първи тестов слайд</p>
//             </div>
//           </div>
//           <div class="embla__slide">
//             <div class="embla__slide__content">
//               <h3>Test Slide 2</h3>
//               <p>Втори тестов слайд</p>
//             </div>
//           </div>
//           <div class="embla__slide">
//             <div class="embla__slide__content">
//               <h3>Test Slide 3</h3>
//               <p>Трети тестов слайд</p>
//             </div>
//           </div>
//         </div>
//       </div>
      
//       <p>Ако виждате 3 цветни слайда, Embla работи!</p>
//     </div>
//   `,
//     styleUrl: './embla-test.component.scss'
// })
// export class EmblaTestComponent implements OnInit {
//     options = {
//         loop: true,
//         align: 'start' as const
//     };

//     ngOnInit(): void {
//         console.log('🧪 EmblaTestComponent initialized');
//     }
// }