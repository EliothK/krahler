import {render, screen} from '@testing-library/react';
import App from './App';

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

