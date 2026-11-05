# BookingScheduleFe

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.18.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Backend environments

The frontend sends API requests to `/booking-schedule` on its own origin.

| Environment | Frontend | API target |
| --- | --- | --- |
| Local | `npm start` on port 4200 | Angular's `proxy.conf.json` forwards to `http://localhost:8080/booking-schedule`. Start the backend with the `local` profile. |
| Production | Vercel at `https://booking-schedule-fe.vercel.app` | `vercel.json` forwards to `https://booking-schedule-be.onrender.com/booking-schedule`. The Render service uses the `prod` profile. |

Deploy the frontend with the repository root as the Vercel Root Directory so Vercel reads `vercel.json`. After deployment, open `/booking-schedule/api/public/specialties` on the frontend domain to confirm that it returns backend JSON. Reload an Angular page such as `/profile/appointments` directly to verify client-side routing.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
