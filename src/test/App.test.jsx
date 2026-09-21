import {render, screen} from '@testing-library/react';
import { vi } from 'vitest';
import App from '../App';

// The build writes a real GitHub snapshot that would leak into these renders; keep the tests independent of it.
vi.mock('../scripts/snapshot', () => ({ SNAPSHOT: null }));

describe('App', () => {
    it('renders exactly one h1', () =>{
        render(<App />);
        expect(screen.getAllByRole('heading', {level:1})).toHaveLength(1);
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

