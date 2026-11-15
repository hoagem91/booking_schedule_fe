import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_INFO } from '../../constants/site-info';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css'
})
export class SiteFooter {
  readonly site = SITE_INFO;
  readonly currentYear = new Date().getFullYear();
}