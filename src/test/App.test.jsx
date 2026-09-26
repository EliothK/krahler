import {render, screen} from '@testing-library/react';
import { vi } from 'vitest';
import App from '../App';

// The build writes a real GitHub snapshot that would leak into these renders; keep the tests independent of it.
vi.mock('../scripts/snapshot', () => ({ SNAPSHOT: null }));

describe('App', () => {
    beforeEach(() => {
        // Contact's warm-up ping would otherwise hit the real network during these renders.
        vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renders exactly one h1', () =>{
        render(<App />);
        expect(screen.getAllByRole('heading', {level:1})).toHaveLength(1);
    });

    // For industry roles the physics background is pitched as a working habit (validating a model against a known answer), not a plan to leave for a PhD.
    it('frames physics as a habit, not a departure', () => {
        const { container } = render(<App />);
        const sub = container.querySelector('.lede-sub');
        expect(sub).toHaveTextContent('check a model against a known answer');
        expect(sub.textContent).not.toMatch(/PhD/);
    });

    it('includes the contact section', () => {
        render(<App />);
        expect(
            screen.getByRole('heading', { level: 2, name: 'Get in touch' }),
        ).toBeInTheDocument();
    });

    it('names every project section', () => {
        render(<App />);
        for (const title of ['SolarCast', 'NeutroSurrogate']){
            expect(screen.getByText(new RegExp(title, 'i'))).toBeInTheDocument();
        }
    });

    it('ships nothing with an unfilled bracket', () => {
        const {container} = render(<App />);
        expect(container.textContent).not.toMatch(/\[__+\]/);
    });
});

