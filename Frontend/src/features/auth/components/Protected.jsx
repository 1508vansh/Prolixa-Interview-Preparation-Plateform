import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router";
import { useState } from "react";
import React from 'react'

const Protected = ({children}) => {
    const { loading, user, handleLogout } = useAuth()
    const [logoutError, setLogoutError] = useState("")

    const onLogout = async () => {
        setLogoutError("")
        try {
            await handleLogout()
        } catch (error) {
            console.error("Logout failed", error)
            setLogoutError("Unable to log out. Please try again.")
        }
    }


    if(loading){
        return (<main><h1>Loading...</h1></main>)
    }

    if(!user){
        return <Navigate to={'/login'} />
    }
    
    return (
        <>
            <div className="auth-toolbar">
                {logoutError && <p role="alert">{logoutError}</p>}
                <button className="button primary-button" type="button" onClick={onLogout}>
                    Log out
                </button>
            </div>
            {children}
        </>
    )
}

export default Protected