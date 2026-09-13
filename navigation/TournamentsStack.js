//TournamentsStack
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TournamentsScreen from "../screens/tournaments/TournamentsScreen";
import CreateTournamentScreen from "../screens/tournaments/CreateTournamentScreen";
import TournamentDetailScreen from "../screens/tournaments/TournamentDetailScreen";

const Stack = createNativeStackNavigator();

export default function TournamentsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TournamentsHome" component={TournamentsScreen} />
      <Stack.Screen name="CreateTournament" component={CreateTournamentScreen} />
      <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
    </Stack.Navigator>
  );
}
