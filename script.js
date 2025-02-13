document.getElementById("manageUsers").addEventListener("click", () => {
    fetch("/get-users")
        .then(response => response.json())
        .then(data => {
            let userTable = `
                <h2>Recent Users</h2>
                <table border="1">
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                    </tr>
            `;

            data.forEach(user => {
                userTable += `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.role}</td>
                    </tr>
                `;
            });

            userTable += `</table> <button id="openModal">Add User</button>`;
            document.getElementById("userTableContainer").innerHTML = userTable;

            document.getElementById("openModal").addEventListener("click", () => {
                document.getElementById("addUserModal").style.display = "block";
            });
        });
});

document.getElementById("addUserForm").addEventListener("submit", (event) => {
    event.preventDefault();

    let userData = {
        username: document.getElementById("username").value,
        email: document.getElementById("email").value,
        role: document.getElementById("role").value
    };

    fetch("/add-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
    }).then(() => {
        document.getElementById("addUserModal").style.display = "none";
    });
});
