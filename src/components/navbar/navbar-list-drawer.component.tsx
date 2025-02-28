import {
	Divider,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
} from "@mui/material";
import { Box } from "@mui/system";

interface NavListProps {
	onClick: () => void;
	navLinks: { title: string; filter: string }[];
	applyFilter: (category: string) => void;
}

export const NavListDrawer: React.FC<NavListProps> = (props) => {
	const { onClick, navLinks, applyFilter } = props;
	return (
		<Box sx={{ width: 250 }} onClick={onClick}>
			<nav aria-label="main mailbox folders">
				<List>
					{navLinks.map((item) => (
						<ListItem disablePadding key={item.title}>
							<ListItemButton onClick={() => applyFilter(item.filter)}>
								{/* <ListItemIcon>{item.icon}</ListItemIcon> */}
								<ListItemText primary={item.title} />
							</ListItemButton>
						</ListItem>
					))}
				</List>
			</nav>
			<Divider />
		</Box>
	);
};
