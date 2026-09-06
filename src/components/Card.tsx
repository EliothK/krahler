interface Props {
  AltText: string;
  ImageLocation: string;
  Paragraph: string;
  Title: string;
}

function Card({ Title, ImageLocation, AltText, Paragraph }: Props) {
  return (
    <div className="card">
      <img src={ImageLocation} alt={AltText} width={200} height={200}></img>
      <h2>{Title}</h2>
      <p>{Paragraph}</p>
    </div>
  );
}

export default Card;
