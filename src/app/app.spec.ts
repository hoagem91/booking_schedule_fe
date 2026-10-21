import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NzIconService, provideNzIcons } from 'ng-zorro-antd/icon';
import { firstValueFrom } from 'rxjs';
import { APP_ICONS } from './app-icons';
import { withSuffix } from '@ant-design/icons-angular';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });
});

describe('Application icons', () => {
  it('renders registered icons as SVG without requesting asset files', async () => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), provideNzIcons(APP_ICONS),
    ] });
    const icons = TestBed.inject(NzIconService);
    const http = TestBed.inject(HttpTestingController);
    for (const icon of APP_ICONS) {
      const svg = await firstValueFrom(icons.getRenderedContent(withSuffix(icon.name, icon.theme)));
      expect(svg.tagName.toLowerCase()).toBe('svg');
      expect(svg.querySelector('path')).not.toBeNull();
    }
    http.expectNone(request => request.url.includes('assets/'));
    http.verify();
  });
});
