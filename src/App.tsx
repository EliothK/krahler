//Components
import Card from "./components/Card";
//Assets
import profilePic from "./assets/iNoWest.png";

function App() {
  return (
    <div>
      <Card
        Title="Elioth Krahler"
        AltText="Profile Picture"
        ImageLocation={profilePic}
        Paragraph="I am a recent college graduate that is excited to write code! Point my
        at your problems and let me go!"
      />
    </div>
  );
}

export default App;
