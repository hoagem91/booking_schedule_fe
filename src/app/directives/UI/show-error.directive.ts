import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  EnvironmentInjector,
  effect,
  input,
  inject
} from '@angular/core';
import { DisplayErrorComponent } from '../../components/display-error/display-error.component';
import { API_SUCCESS_CODE } from '../../models/api-response.model';

@Directive({
  selector: '[appShowOnErrorCode]',
  standalone: true
})
export class ShowErrorDirective {
  private originalTemplate = inject<TemplateRef<any>>(TemplateRef);
  private viewContainer = inject<ViewContainerRef>(ViewContainerRef);
  private injector = inject<EnvironmentInjector>(EnvironmentInjector);
  appShowOnErrorCode = input<string | null>();
  errorMessage = input<string>('');
  allowReloadPage = input<boolean>(true);

  constructor() {
    effect(() => {
      const code = this.appShowOnErrorCode();
      const msg = this.errorMessage();
      const allowReload = this.allowReloadPage();

      this.viewContainer.clear();

      if (!code || code === String(API_SUCCESS_CODE)) {
        this.viewContainer.createEmbeddedView(this.originalTemplate);
      } else {
        const compRef = this.viewContainer.createComponent(DisplayErrorComponent, {
          environmentInjector: this.injector
        });
        compRef.instance.code = code;
        compRef.instance.message = msg;
        compRef.instance.allowReloadPage = allowReload;
      }
    });
  }
}
