import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  EnvironmentInjector,
  effect,
  input,
  inject,
  ElementRef
} from '@angular/core';
import { DisplayLoadingComponent } from '../../components/display-loading/display-loading.component';

@Directive({
  selector: '[appShowLoading]',
  standalone: true
})
export class ShowLoadingDirective {
  private originalTemplate = inject<TemplateRef<any>>(TemplateRef);
  private viewContainer = inject<ViewContainerRef>(ViewContainerRef);
  private injector = inject<EnvironmentInjector>(EnvironmentInjector);
  private elementRef = inject<ElementRef>(ElementRef);
  appShowLoading = input<boolean>(false);

  constructor() {
    effect(() => {
      const isLoading = this.appShowLoading();
      this.viewContainer.clear();

      if (isLoading) {
        const parentElement = this.elementRef.nativeElement.parentElement;
        const parentWidth = parentElement ? parentElement.offsetWidth : window.innerWidth;
        
        const compRef = this.viewContainer.createComponent(DisplayLoadingComponent, {
          environmentInjector: this.injector
        });
        
        compRef.instance.setParentWidth(parentWidth);
      } else {
        this.viewContainer.createEmbeddedView(this.originalTemplate);
      }
    });
  }
}